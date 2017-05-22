#!/usr/bin/perl -w
use strict;
use feature 'unicode_strings';
use utf8;
use Carp;
use URI::Escape;
use FileHandle;

my %facebook; # real_fb_id => { name =>, friends => }
my @facebook; # [fbname]
my %fbname_to_id; # fbname => [real_fb_id]
my %diggy; # diggy_uid => { name => , surname =>, fb_id =>, portal_fb_id => }
my %fb_diggy; # fb_id => diggy_uid ;; from friends.tsv, so can have double mapping
my %diggy_fb; # diggy_uid => real_fb_id
my %skip_diggy; # diggy_uid => ignore
my %skip_fb; # real_fb_id => ignore
my %diggy_to_fb_cache; # calculated from the slow name matching path

sub main() {
    open(DIGGY, $ARGV[0]) or die "no $ARGV[0]: $!";
    open(FACEBOOK, $ARGV[1]) or die "no $ARGV[1]: $!";
    while (<FACEBOOK>) {
        chomp;
        my @bits = split(/\t/o);
        die "?? '$_'" unless @bits == 3;
        $facebook{$bits[2]} = { name => $bits[0], friends => $bits[1] };
        $fbname_to_id{$bits[0]} ||= [];
        push(@{$fbname_to_id{$bits[0]}}, $bits[2]);
        push(@facebook, $bits[0]);
    }

    updateSkip();
    preloadMap();

    # name => diggy_id -- will have fb_id since two lines in diggy file mapping to single facebook name
    my %dup_name_check;
    while (<DIGGY>) {
        next if /^uid/o;
        my @parts = split(/\t/o);
        die "?? '$_'" unless @parts == 15;
        next if defined $skip_diggy{$parts[0]};

        $diggy{$parts[0]} = { name => $parts[4], surname => $parts[5], fb_id => $parts[2], portal_fb_id => $parts[3] };

        fb_diggy($parts[2], $parts[0]);
        fb_diggy($parts[3], $parts[0]);

        next if $parts[4] eq '' && $parts[5] eq '';
        next if defined $facebook{$parts[2]} || defined $facebook{$parts[3]};
        next if defined $diggy_fb{$parts[0]};

        my $name = "$parts[4] $parts[5]";
        my $tmp = $fbname_to_id{$name};
        if (defined $tmp && @$tmp == 1) {
            if (defined $dup_name_check{$name}) {
                delete $diggy_fb{$dup_name_check{$name}};
                delete $fb_diggy{$tmp->[0]};
                print "<LI> Dup Name $name\n";
                next;
            }
            $dup_name_check{$name} = $parts[0];
            # Common case for failure here is one friend with a name showing up twice in the Diggy data.
            # In that case, add them to both numbers to the %diggy_to_fb list with fake fbids, disambiguate later
            # into @skip and %diggy_to_fb

            die "? $parts[0]" if defined $diggy_fb{$parts[0]};
            fb_diggy($tmp->[0], $parts[0]);
            next;
        }

        $parts[4] =~ s/^'//o;

        my @match = grep(/\b$parts[4]/, @facebook);
        my @match2 = grep(/\b$parts[5]/, @match);

        if (@match2 == 1) {
            my @ids = @{$fbname_to_id{$match2[0]}};
            die "?? $match2[0]" if @ids != 1;
            print "slow $match2[0]  -- $ids[0] $parts[0]\n";
            fb_diggy($ids[0], $parts[0]);
            $diggy_to_fb_cache{$parts[0]} = $ids[0];
        }
    }

    writeCache();

    foreach my $diggy_id (sort keys %diggy) {
        next if defined $diggy_fb{$diggy_id};
        my $tmp = $diggy{$diggy_id};
        my $name = "$tmp->{name} $tmp->{surname}";
        print qq{<LI> NoFacebook: $diggy_id <A HREF="http://www.facebook.com/$tmp->{fb_id}">($name)</A>\n};
    }

    print "<H3>No Diggy</H3>\n";
    foreach my $real_fb_id (sort keys %facebook) {
        next if defined $fb_diggy{$real_fb_id} || defined $skip_fb{$real_fb_id};
        print qq{<LI> $real_fb_id, # <A HREF="https://www.facebook.com/$real_fb_id">$facebook{$real_fb_id}->{name}</A>\n};
    }
}

sub updateSkip {
    my @skip =
      (
       1,       # Mr. Bill
       8700592, # Me
#       2859,    # Aileen Middleton, lv 83; actual 4114553 both facebook.com/100003023571086
#       # Unfriended, still in friends.tsv 2017-05-17
#       3859449, # Donna Bleau
#       2053768, # Maria Mponatsou
#       2536696, # Marco Fogliana
#       2749055, # Christie Machado
#       3338456, # Bill Smith
#       3371062, # Rudi Metzger
#       3505908, # Belinda Alexander
#       3519794, # Elisabeth Reichegger
       # Unfriended or vanished still in neighbors-2017-05-19
       13612984,
       1536920,
       1629451,
       30675,
       3332135,
       3601045,
       3889711,
       3952285,
       4041789,
       690435,
      );
    foreach my $i (@skip) {
        $skip_diggy{$i} = 1;
    }

    my @missing_2017_05_07 =
        (
         100001723830187, # LubomÃ­r HÃ¡jek
         100007643651962, # Scott Guttman
         100011442256692, # Marie Černá
         100015274547395, # Janet Benjaminsson
         1217397195, # Sabina Goedhart
        );
    my @missing_2017_05_19 =
        (
         100001723830187, # LubomÃ­r HÃ¡jek
         100007643651962, # Scott Guttman
         100008035579224, # Bonnie O'Brien
         100011442256692, # Marie Černá
         100012490328985, # Mary Ann Fulcher
         100015274547395, # Janet Benjaminsson
         1020257925, # Kevin Goodwin
         1217397195, # Sabina Goedhart
         1232089733, # Nelda Gay Meeks
         616851393, # Hasan Ahmed
        );
    # invite gloria sharron
    # darhon liebenow
    my @nodiggy =
        (
         100001032018722, # Miranda Pavelle
         1651445697, # Deoridhe Grimsdottir
        );
   push(@nodiggy, @missing_2017_05_19);
   foreach my $i (@nodiggy) {
       $skip_fb{$i} = 1;
   }
}

sub preloadMap {
    my %diggy_to_fb =
        (
         4433680 => 100008217459501, # Petra Schmidt
         4433444 => 100000903634582, # Schmidt Petra
         4955288 => 100008778043288, # Jane White (diggygranny)
         4551690 => 100011083297343, # Jane Renee White (granny)
         10364218 => 100000507110998, # Annukka Sorjonen
         10541652 => 100009130533968, # Ghislain Turmel
         13291563 => 100007320409254, # Ghislain Turmel
         10791154 => 589808041, # Pat Carney
         10825353 => 100014705077243, # Elly Hoornweg
         10834825 => 100015401922684, # Cams Diggy
         11033025 => 1322505954, # Mariann Madsen
         11628996 => 100014958403940, # Meghan Behrendt
         11655259 => 100000338171179, # Trang Duong
         11995524 => 100015143437485, # Nathalie Moerman
         6240963 => 100012774120491, # Nathalie Moerman
         13309222 => 100015195193586, # EL Ombre
         13387105 => 100002675715129, # Mariusz Winek
         13433586 => 100000011227970, # Miranda Renee Bergemann
         13671239 => 1428528727, # Arvena Large Plamowski
         13674985 => 100003962916700, # Karl Heinz
         6346577 => 100007043643852, # Karl Heinz
         14006149 => 100015294488790, # Mary Carter
         4068444 => 553351014, # Zhao
         4107061 => 100000578060005, # Denise Macaigne
         6331399 => 100013531026224, # Denise Macaigne
         4116558 => 100000437498703, # Sylvie Brielles
         4157395 => 100011104006638, # Joan Alexander
         4864056 => 100007404074348, # Joan Alexander
         4170477 => 100000500511778, # Sonia Ssonniaa
         4180177 => 100009695564799, # Kristen Davis
         5665278 => 100011703835108, # Kristen Davis
         4189088 => 1000087127, # Yvonne Mcconnon
         4329419 => 100001973204503, # Susan Hall
         5631988 => 1094652315, # Susan Hall
         4367712 => 100008928554400, # Red Jocincet
         4433585 => 100010123488217, # Aki Niemi
         4542051 => 587807832, # Geri Chubb
         4562780 => 1510842815, # Joyce Harris
         4638707 => 100000457764454, # alzbeta.penzesova
         4729028 => 100001157954595, # rj gareli
         4751751 => 100006082590526, # michelle o'driscoll
         4855999 => 1179263857, # magda lorena sanchez
         4872704 => 100003981688991, # Ionut Cristudor
         5330226 => 100002382042398, # Ali Aksoy
         5408218 => 100003291096407, # Diggy Skeeter
         5480548 => 100011688960205, # Anne Laura Suplee
         5673518 => 100009870606392, # Paweł Lewandowski
         5786474 => 100004696957071, # Ghiless-Lucas Jeanney
         5825131 => 100006997843334, # Florent Diggy
         5939113 => 1077796654, # Ja Ta La
         5996995 => 1178798688, # Audrey Enzo Flavio
         6044443 => 100009077621588, # Dorota Baszczyńska
         6066852 => 100002243446890, # Sophie Cocusse
         6082961 => 100012779986628, # Sandro Barraco
         6123834 => 100009274807146, # Людмила Сафронова
         6307883 => 100000257056256, # Malgorzata Koniecko
         6567916 => 600874156, # Stacey Fowlow Jacobs
         6661593 => 1230585957, # Pip Butler
         6809736 => 100008112848261, # Christian Georges
         6833106 => 519838513, # Scot Cota
         6851568 => 100000501704324, # Gwen Liao
         6916607 => 100006372728968, # Vinh Bui
         7006830 => 100001451041101, # Irina Volodina
         7274213 => 1546551436, # Caterina Bou
         7355741 => 1408126896, # Carolyn Platt
         7489930 => 688750914, # Toni De Groot Doula
         7618859 => 100005866211503, # Amy Major
         7789638 => 100001602091102, # Tùng Duy Dương
         7940780 => 100012336498864, # Kwang Noi Camfil
         8007501 => 1056839357, # Mai Nguyen
         8018504 => 1346312396, # Michelle Irvin Hooper
         8133875 => 100013973620327, # Robin Mazur
         8204074 => 100000604464160, # Nessie Jane
         8781560 => 100014970496962, # Marty Sera
         9900609 => 702910744, # TJ Johnson
         # 2017-05-19
         6719428 => 100001779918508, # Eason Joseph
         6689814 => 100006925664231, # Joseph Eason
         10714120 => 100014681163032, # Phillip Owens
         6191300 => 100001439220159, # Phillip Gregory Owens
         11664491 => 100015740076322, # Maya Najia
         13465096 => 100009708062352, # Fran Hickey
         13644450 => 100004170797993, # Michael Mike Kiral
         6065174 => 100005043400878, # Karim Wad Diab
         9216389 => 100015635684506, # Joanna Smo
        );

    while (my ($d, $f) = each %diggy_to_fb) {
        fb_diggy($f, $d);
    }
    readCache();
}

my $cache_path = "/Users/echoalfa/personal/games/diggy-tools/friend-check.cache";

sub readCache() {
    my $fh = new FileHandle($cache_path);
    return unless $fh;
    while (<$fh>) {
        die "?? $_ " unless /^(\d+)\t(\d+)$/o;
        if (defined $facebook{$2}) {
            $diggy_to_fb_cache{$1} = $2;
            fb_diggy($2, $1);
            die "? $1 $2" unless defined $diggy_fb{$1};
            die "? $1 $2" unless defined $fb_diggy{$2};
        }
    }
}

sub writeCache() {
    my $fh = new FileHandle(">$cache_path") or die "?: $!";
    while (my ($k, $v) = each %diggy_to_fb_cache) {
        print $fh "$k\t$v\n";
    }
    close($fh) or die "?: $!";
}

sub fb_diggy {
    my ($fb, $diggy) = @_;

    return if $fb == 0;
    confess "?? $fb $diggy $fb_diggy{$fb}" if defined $fb_diggy{$fb} && $diggy != $fb_diggy{$fb};
    $fb_diggy{$fb} = $diggy;
    if (defined $facebook{$fb}) {
        die "?? $fb $diggy $diggy_fb{$diggy}" if defined $diggy_fb{$fb};
        $diggy_fb{$diggy} = $fb;
    }
}

# xmllint --format - <friends.htm | perl -ne 'last if /Sent Friend Requests/o; next unless /^          <li>/o;s/^ +<li>/<li>/o;s. \((\w|\s|,)+\)</li>$..o;s,\[.*\],,o;print' >|/tmp/foo.html

main();
# https://www.facebook.com/photo.php?fbid=10213177875906914&set=a.1599251426611.2083617.1395796012&type=3&source=11&referrer_profile_id=1395796012
__END__
https://developers.facebook.com/docs/graph-api/reference/friend-list/
100014570768803


https://www.facebook.com/ajax/pagelet/generic.php/AllFriendsAppCollectionPagelet?dpr=2&data=%7B%22collection_token%22%3A%22100014570768803%3A2356318349%3A2%22%2C%22cursor%22%3A%22MDpub3Rfc3RydWN0dXJlZDoxMDAwMDAxNDE3NzY4NTk%3D%22%2C%22disablepager%22%3Afalse%2C%22overview%22%3Afalse%2C%22profile_id%22%3A%22100014570768803%22%2C%22tab_key%22%3A%22friends%22%2C%22lst%22%3A%22100014570768803%3A100014570768803%3A1493799165%22%2C%22ftid%22%3Anull%2C%22order%22%3Anull%2C%22sk%22%3A%22friends%22%2C%22importer_state%22%3Anull%7D&__user=100014570768803&__a=1&__dyn=5V5yAW8-aFoFxp2u6aOGeEwlzkqbxqbAKGiBAyecqrYxEqx-9V8CdwIhEpyEnwgVK6pGwHzQubyR88xK5WAzHBCVrDm4XzErDWxaFQ3uaVVojxCVEiHWCDxh1rz8-cxnxm3i7oG9J7BwBx6eyUK2m5K5FLZ1aiJ129x-F8lF4ypKbG5pK5EG2eVQh1q4998uCDyV8ooy9Dx6WKcDJ6x7yoyEWFGzbh8-15Bhbyk&__af=iw&__req=ak&__be=-1&__pc=PHASED%3ADEFAULT&__rev=2996310

    https://www.facebook.com/ajax/pagelet/generic.php/AllFriendsAppCollectionPagelet?dpr=2&data=%7B%22collection_token%22%3A%22100014570768803%3A2356318349%3A2%22%2C%22cursor%22%3A%22MDpub3Rfc3RydWN0dXJlZDoxMDAwMDI4NzA4MTcwNjY%3D%22%2C%22disablepager%22%3Afalse%2C%22overview%22%3Afalse%2C%22profile_id%22%3A%22100014570768803%22%2C%22tab_key%22%3A%22friends%22%2C%22lst%22%3A%22100014570768803%3A100014570768803%3A1493799165%22%2C%22ftid%22%3Anull%2C%22order%22%3Anull%2C%22sk%22%3A%22friends%22%2C%22importer_state%22%3Anull%7D&__user=100014570768803&__a=1&__dyn=5V5yAW8-aFoFxp2u6aOGeEwlzkqbxqbAKGiBAyecqrYxEqx-9V8CdwIhEpyEnwgVK6pGwHzQubyR88xK5WAzHBCVrDm4XzErDWxaFQ3uaVVojxCVEiHWCDxh1rz8-cxnxm3i7oG9J7BwBx6eyUK2m5K5FLZ1aiJ129x-F8lF4ypKbG5pK5EG2eVQh1q4998uCDyV8ooy9Dx6WKcDJ6x7yoyEWFGzbh8-15Bhbyk&__af=iw&__req=ae&__be=-1&__pc=PHASED%3ADEFAULT&__rev=2996310
    https://www.facebook.com/ajax/pagelet/generic.php/AllFriendsAppCollectionPagelet?dpr=2&data=%7B%22collection_token%22%3A%22100014570768803%3A2356318349%3A2%22%2C%22cursor%22%3A%22MDpub3Rfc3RydWN0dXJlZDoxMDAwMDIxODE1ODEyNzE%3D%22%2C%22disablepager%22%3Afalse%2C%22overview%22%3Afalse%2C%22profile_id%22%3A%22100014570768803%22%2C%22tab_key%22%3A%22friends%22%2C%22lst%22%3A%22100014570768803%3A100014570768803%3A1493799165%22%2C%22ftid%22%3Anull%2C%22order%22%3Anull%2C%22sk%22%3A%22friends%22%2C%22importer_state%22%3Anull%7D&__user=100014570768803&__a=1&__dyn=5V5yAW8-aFoFxp2u6aOGeEwlzkqbxqbAKGiBAyecqrYxEqx-9V8CdwIhEpyEnwgVK6pGwHzQubyR88xK5WAzHBCVrDm4XzErDWxaFQ3uaVVojxCVEiHWCDxh1rz8-cxnxm3i7oG9J7BwBx6eyUK2m5K5FLZ1aiJ129x-F8lF4ypKbG5pK5EG2eVQh1q4998uCDyV8ooy9Dx6WKcDJ6x7yoyEWFGzbh8-15Bhbyk&__af=iw&__req=ag&__be=-1&__pc=PHASED%3ADEFAULT&__rev=2996310
    https://www.facebook.com/ajax/pagelet/generic.php/AllFriendsAppCollectionPagelet?dpr=2&data=%7B%22collection_token%22%3A%22100014570768803%3A2356318349%3A2%22%2C%22cursor%22%3A%22MDpub3Rfc3RydWN0dXJlZDoxMDAwMTExNjIxNzUyNzA%3D%22%2C%22disablepager%22%3Afalse%2C%22overview%22%3Afalse%2C%22profile_id%22%3A%22100014570768803%22%2C%22tab_key%22%3A%22friends%22%2C%22lst%22%3A%22100014570768803%3A100014570768803%3A1493799165%22%2C%22ftid%22%3Anull%2C%22order%22%3Anull%2C%22sk%22%3A%22friends%22%2C%22importer_state%22%3Anull%7D&__user=100014570768803&__a=1&__dyn=5V5yAW8-aFoFxp2u6aOGeEwlzkqbxqbAKGiBAyecqrYxEqx-9V8CdwIhEpyEnwgVK6pGwHzQubyR88xK5WAzHBCVrDm4XzErDWxaFQ3uaVVojxCVEiHWCDxh1rz8-cxnxm3i7oG9J7BwBx6eyUK2m5K5FLZ1aiJ129x-F8lF4ypKbG5pK5EG2eVQh1q4998uCDyV8ooy9Dx6WKcDJ6x7yoyEWFGzbh8-15Bhbyk&__af=iw&__req=ai&__be=-1&__pc=PHASED%3ADEFAULT&__rev=2996310
    https://www.facebook.com/ajax/pagelet/generic.php/AllFriendsAppCollectionPagelet?dpr=2&data=%7B%22collection_token%22%3A%22100014570768803%3A2356318349%3A2%22%2C%22cursor%22%3A%22MDpub3Rfc3RydWN0dXJlZDoxMDAwMDAxNDE3NzY4NTk%3D%22%2C%22disablepager%22%3Afalse%2C%22overview%22%3Afalse%2C%22profile_id%22%3A%22100014570768803%22%2C%22tab_key%22%3A%22friends%22%2C%22lst%22%3A%22100014570768803%3A100014570768803%3A1493799165%22%2C%22ftid%22%3Anull%2C%22order%22%3Anull%2C%22sk%22%3A%22friends%22%2C%22importer_state%22%3Anull%7D&__user=100014570768803&__a=1&__dyn=5V5yAW8-aFoFxp2u6aOGeEwlzkqbxqbAKGiBAyecqrYxEqx-9V8CdwIhEpyEnwgVK6pGwHzQubyR88xK5WAzHBCVrDm4XzErDWxaFQ3uaVVojxCVEiHWCDxh1rz8-cxnxm3i7oG9J7BwBx6eyUK2m5K5FLZ1aiJ129x-F8lF4ypKbG5pK5EG2eVQh1q4998uCDyV8ooy9Dx6WKcDJ6x7yoyEWFGzbh8-15Bhbyk&__af=iw&__req=ak&__be=-1&__pc=PHASED%3ADEFAULT&__rev=2996310
